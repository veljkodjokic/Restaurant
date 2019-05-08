<!-- Divider -->
<?php
$invoice=\App\Invoice::where([
    ['user_id', '=', \Auth::user()->id],
    ['status', '=', 0]])->first();

$tickets=$invoice->tickets()->get();
?>
<hr class="my-3">
<!-- Heading -->
<span class="h2 font-weight-bold mb-0">Open Ticket</span>
<!-- Navigation -->
@foreach($tickets as $ticket)
    <?php
    $portion=$ticket->portion()->first();
    $good=$portion->good()->first();
    ?>
    <p class="mt-3 mb-0 text-muted text-sm pointer" style="background-color: #ffe4c4">
        <span class="text-success mr-2"><i class="fas fa-concierge-bell"></i>  x{{ $ticket->quantity }}</span>
        <span class="text-nowrap">{{ $good->name }} ({{ $portion->portion }})</span>
    </p>
@endforeach
<h2 class="text-muted mt-3">Total: <span class="text-success">{{ $invoice->showTotal() }}</span></h2>
<button type="submit" id="save-invoice" class="btn btn-success mt--1">Save Ticket</button>
<script type="text/javascript">
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    });
    $("#save-invoice").click(function(e){
        e.preventDefault();
        var id = {{ $invoice->id }};
        $.ajax({
            type:'POST',
            url:'/save-ticket',
            data:{id:id},
            success:function(){
                location.reload();
            }
        });
    });
</script>