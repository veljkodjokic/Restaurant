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
    <form action="/delete-ticket" id="delete-ticket" method="post">
    <input type="hidden" name="id" value="{{ $ticket->id }}"/>
    @csrf
    <p class="mt-3 mb-0 text-muted text-sm" style="background-color: #ffe4c4">
        <span class="text-success mr-2"><i class="fas fa-concierge-bell"></i>  x{{ $ticket->quantity }}</span>
        <span class="text-nowrap">{{ $good->name }} ({{ $portion->portion }})</span>
        <span onclick="document.getElementById('delete-ticket').submit();" class="text-danger float-right pr-2 pointer"><i class="fas fa-times"></i></span>
    </p>
    </form>
@endforeach
<h2 class="text-muted mt-3">Total: <span class="text-success">{{ $invoice->showTotal() }}</span></h2>
<button type="submit" id="save-invoice" class="btn btn-success mt--1">Save Ticket</button>
<button type="submit" id="delete-invoice" class="btn btn-danger  mt-2">Delete Ticket</button>
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

    $("#delete-invoice").click(function(e){
        e.preventDefault();
        if(confirm('Do you want to delete this ticket?')){
            var id = {{ $invoice->id }};
            $.ajax({
                type:'POST',
                url:'/delete-invoice',
                data:{id:id},
                success:function(){
                    location.reload();
                }
            });
        }

    });
</script>