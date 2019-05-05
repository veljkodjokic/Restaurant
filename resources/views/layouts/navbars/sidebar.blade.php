@auth()
    @if(\Auth::user()->isAdmin())
        @include('layouts.navbars.sides.admin')
    @else
        @include('layouts.navbars.sides.auth')
    @endif
@endauth